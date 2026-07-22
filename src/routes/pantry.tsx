import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { getSessionUser } from "#/auth/auth.functions";
import { getIngredientNames } from "#/recipes/recipes.functions";
import {
  getPantryItems,
  addPantryItem,
  removePantryItem,
  getPantryMatches,
  getPantryGroups,
  removeHouseholdPantryItem,
  clearPantry,
} from "#/pantry/pantry.functions";
import type { PantryMatch } from "#/pantry/pantry.server";
import {
  getMyHouseholdInfo,
  getMyInvites,
  createHousehold,
  inviteToHousehold,
  respondToInvite,
  removeMember,
  leaveHousehold,
  transferOwnership,
  getKnownUsernames,
  getPendingInviteUsernames,
} from "#/households/households.functions";
import { RecipeCard } from "#/recipes/RecipeCard";
import { RecipeCardSkeleton } from "#/recipes/RecipeCardSkeleton";
import { DropdownButton } from "#/ui/DropdownButton";

export const Route = createFileRoute("/pantry")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    if (!user.isAdmin && !user.isSubscriber) {
      throw redirect({ to: "/subscribers-only", search: { feature: "pantry" } });
    }
    return { user };
  },
  loader: async ({ context }) => {
    const [pantryItems, knownIngredientNames, household, groups, invites, knownUsernames] = await Promise.all([
      getPantryItems(),
      getIngredientNames(),
      getMyHouseholdInfo(),
      getPantryGroups(),
      getMyInvites(),
      getKnownUsernames(),
    ]);
    const pendingInviteUsernames =
      household && household.ownerId === context.user.id
        ? await getPendingInviteUsernames({ data: { householdId: household.id } })
        : [];
    return {
      pantryItems,
      knownIngredientNames,
      household,
      groups,
      invites,
      knownUsernames,
      pendingInviteUsernames,
      userId: context.user.id,
      username: context.user.username,
    };
  },
  component: PantryPage,
});

function missingIngredientNames(match: PantryMatch, pantryNamesLower: Set<string>): string[] {
  return match.ingredients
    .filter((ingredient) => !pantryNamesLower.has(ingredient.name.toLowerCase()))
    .map((ingredient) => ingredient.name);
}

// Assigned to other household members' chip groups, by position among the
// non-"you" members (stable since households.server.ts orders members by
// name) — "you" keeps the app's usual neutral accent styling.
const memberColors = [
  { bg: "bg-sky-50 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-rose-50 dark:bg-rose-950", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300" },
];

function PantryPage() {
  const loaderData = Route.useLoaderData();
  const { household } = loaderData;
  const router = useRouter();
  const addPantryItemFn = useServerFn(addPantryItem);
  const removePantryItemFn = useServerFn(removePantryItem);
  const getPantryMatchesFn = useServerFn(getPantryMatches);
  const getPantryGroupsFn = useServerFn(getPantryGroups);
  const getPantryItemsFn = useServerFn(getPantryItems);
  const removeHouseholdPantryItemFn = useServerFn(removeHouseholdPantryItem);
  const clearPantryFn = useServerFn(clearPantry);
  const createHouseholdFn = useServerFn(createHousehold);
  const inviteToHouseholdFn = useServerFn(inviteToHousehold);
  const respondToInviteFn = useServerFn(respondToInvite);
  const removeMemberFn = useServerFn(removeMember);
  const leaveHouseholdFn = useServerFn(leaveHousehold);
  const transferOwnershipFn = useServerFn(transferOwnership);

  const [householdName, setHouseholdName] = useState("");
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [householdSubmitting, setHouseholdSubmitting] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const [pantryNames, setPantryNames] = useState(loaderData.pantryItems);
  const [matches, setMatches] = useState<PantryMatch[] | null>(null);
  const [groups, setGroups] = useState(loaderData.groups);
  const [draft, setDraft] = useState("");

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setMatches(null);
    void getPantryMatchesFn().then((result) => {
      if (cancelledRef.current) return;
      setMatches(result);
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [getPantryMatchesFn]);

  function applyMatches(nextMatches: PantryMatch[]) {
    if (!("startViewTransition" in document)) {
      setMatches(nextMatches);
      return;
    }
    document.startViewTransition(() => {
      flushSync(() => setMatches(nextMatches));
    });
  }

  function patchOwnGroup(updateItems: (items: string[]) => string[]) {
    setGroups(
      (prev) =>
        prev?.map((group) =>
          group.ownerId === loaderData.userId ? { ...group, items: updateItems(group.items) } : group,
        ) ?? prev,
    );
  }

  async function refreshAfterChange() {
    const [nextMatches, nextGroups] = await Promise.all([getPantryMatchesFn(), getPantryGroupsFn()]);
    applyMatches(nextMatches);
    setGroups(nextGroups);
  }

  async function addIngredient(rawName: string) {
    const name = rawName.trim().toLowerCase();
    if (!name || pantryNames.includes(name)) return;
    setPantryNames((prev) => [...prev, name]);
    patchOwnGroup((items) => [...items, name].sort());
    await addPantryItemFn({ data: { name } });
    await refreshAfterChange();
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const name = draft;
    setDraft("");
    await addIngredient(name);
  }

  async function handleRemoveItem(name: string) {
    setPantryNames((prev) => prev.filter((n) => n !== name));
    patchOwnGroup((items) => items.filter((n) => n !== name));
    await removePantryItemFn({ data: { name } });
    await refreshAfterChange();
  }

  async function handleRemoveOtherItem(ownerId: string, name: string) {
    setGroups(
      (prev) => prev?.map((g) => (g.ownerId === ownerId ? { ...g, items: g.items.filter((n) => n !== name) } : g)) ?? prev,
    );
    await removeHouseholdPantryItemFn({ data: { ownerId, name } });
    await refreshAfterChange();
  }

  async function handleClearPantry() {
    if (!window.confirm("Clear every item from everyone's pantry? This can't be undone.")) return;
    await clearPantryFn();
    const [nextPantryItems, nextMatches, nextGroups] = await Promise.all([
      getPantryItemsFn(),
      getPantryMatchesFn(),
      getPantryGroupsFn(),
    ]);
    setPantryNames(nextPantryItems);
    applyMatches(nextMatches);
    setGroups(nextGroups);
  }

  async function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!householdName.trim()) return;
    setHouseholdSubmitting(true);
    setHouseholdError(null);
    try {
      await createHouseholdFn({ data: { name: householdName.trim() } });
      setHouseholdName("");
      await router.invalidate();
      await refreshAfterChange();
    } catch (err) {
      setHouseholdError(err instanceof Error ? err.message : "Failed to create household.");
    } finally {
      setHouseholdSubmitting(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!household || !inviteUsername.trim()) return;
    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSent(false);
    try {
      await inviteToHouseholdFn({
        data: { householdId: household.id, username: inviteUsername.trim() },
      });
      setInviteUsername("");
      setInviteSent(true);
      await router.invalidate();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRespondToInvite(inviteId: string, accept: boolean) {
    await respondToInviteFn({ data: { inviteId, accept } });
    await router.invalidate();
    await refreshAfterChange();
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!household) return;
    await removeMemberFn({ data: { householdId: household.id, memberUserId } });
    await router.invalidate();
    await refreshAfterChange();
  }

  async function handleTransferOwnership(memberUserId: string, memberName: string) {
    if (!household) return;
    if (
      !window.confirm(
        `Make ${memberName} the owner of "${household.name}"? You'll become a regular member.`,
      )
    ) {
      return;
    }
    await transferOwnershipFn({ data: { householdId: household.id, newOwnerId: memberUserId } });
    await router.invalidate();
    await refreshAfterChange();
  }

  async function handleLeaveOrDelete() {
    if (!household) return;
    const isOwner = household.ownerId === loaderData.userId;
    const message = isOwner
      ? `Delete "${household.name}"? This removes all members. This can't be undone.`
      : `Leave "${household.name}"?`;
    if (!window.confirm(message)) return;
    await leaveHouseholdFn({ data: { householdId: household.id } });
    await router.invalidate();
    await refreshAfterChange();
  }

  const isHouseholdOwner = household?.ownerId === loaderData.userId;
  const pantryNamesLower = new Set((groups ? groups.flatMap((g) => g.items) : pantryNames).map((name) => name.toLowerCase()));
  const readyToMake = (matches ?? []).filter((match) => match.totalIngredients === match.matchedIngredients);
  const closeMatches = (matches ?? []).filter((match) => match.totalIngredients > match.matchedIngredients);

  // Excludes yourself and anyone already a member or already-invited, since inviting either fails server-side.
  const householdInviteUsernames = loaderData.knownUsernames.filter(
    (name) =>
      name !== loaderData.username &&
      !household?.members.some((member) => member.username === name) &&
      !loaderData.pendingInviteUsernames.includes(name),
  );

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Pantry</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink/60">List what you have, and we'll show you what you can make.</p>
        <DropdownButton
          label="Household"
          icon={<Users size={16} />}
          badge={household ? household.members.length : undefined}
        >
          {household ? (
            <>
              <p className="text-ink/70">{household.name}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {household.members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between text-ink/70">
                    <span>
                      {member.username ? (
                        <Link
                          to="/u/$username"
                          params={{ username: member.username }}
                          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                        >
                          {member.name}
                        </Link>
                      ) : (
                        member.name
                      )}
                      {member.username && ` (@${member.username})`}
                      {member.id === loaderData.userId && " (you)"}
                      {member.id === household.ownerId && " (owner)"}
                    </span>
                    {household.ownerId === loaderData.userId &&
                      member.id !== household.ownerId && (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => void handleTransferOwnership(member.id, member.name)}
                            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                          >
                            Make owner
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveMember(member.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                  </li>
                ))}
              </ul>
              {household.ownerId === loaderData.userId && (
                <form onSubmit={(e) => void handleInvite(e)} className="mt-2 flex gap-2">
                  <input
                    className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
                    list="household-invite-usernames"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="Invite by username"
                  />
                  <button
                    type="submit"
                    disabled={inviteSubmitting || !inviteUsername.trim()}
                    className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
                  >
                    {inviteSubmitting ? "Inviting..." : "Invite"}
                  </button>
                </form>
              )}
              {inviteError && <p className="text-red-600">{inviteError}</p>}
              {inviteSent && <p className="text-green-700">Invite sent.</p>}
              <button
                type="button"
                onClick={() => void handleLeaveOrDelete()}
                className="mt-2 self-start text-sm font-medium text-red-600 hover:text-red-700"
              >
                {household.ownerId === loaderData.userId ? "Delete household" : "Leave household"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink/50">
                Pool your pantry with people you live with: everyone's items count toward "what can we
                make."
              </p>
              <form onSubmit={(e) => void handleCreateHousehold(e)} className="mt-2 flex gap-2">
                <input
                  className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Household name"
                />
                <button
                  type="submit"
                  disabled={householdSubmitting || !householdName.trim()}
                  className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
                >
                  {householdSubmitting ? "Creating..." : "Create"}
                </button>
              </form>
              {householdError && <p className="text-red-600">{householdError}</p>}

              {loaderData.invites.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <h3 className="font-medium text-ink/70">Pending invites</h3>
                  {loaderData.invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg border border-accent-100 px-3 py-2"
                    >
                      <span className="text-ink/70">
                        {invite.householdName} (invited by {invite.inviterName})
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => void handleRespondToInvite(invite.id, true)}
                          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRespondToInvite(invite.id, false)}
                          className="text-sm text-ink/50 hover:text-ink"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DropdownButton>
      </div>
      {household && (
        <p className="mt-1 text-sm text-ink/50">
          Showing combined pantry with {household.name} ({household.members.length}{" "}
          member{household.members.length === 1 ? "" : "s"}).
        </p>
      )}

      <datalist id="household-invite-usernames">
        {householdInviteUsernames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <form onSubmit={(e) => void handleAddItem(e)} className="mt-6 flex gap-2">
        <input
          className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          list="pantry-ingredient-names"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an ingredient you have on hand..."
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <datalist id="pantry-ingredient-names">
        {loaderData.knownIngredientNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {groups ? (
        <div className="mt-4 flex flex-col gap-3">
          {groups.map((group) => {
            const isYou = group.ownerId === loaderData.userId;
            const otherIndex = groups.filter((g) => g.ownerId !== loaderData.userId).findIndex((g) => g.ownerId === group.ownerId);
            const color = isYou ? { bg: "bg-accent-50", text: "text-ink/70" } : memberColors[otherIndex % memberColors.length];
            const canRemove = isYou || isHouseholdOwner;
            return (
              <div key={group.ownerId}>
                <span className={`text-xs font-medium ${isYou ? "text-ink/50" : color.text}`}>
                  {isYou ? "You" : group.ownerName}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {group.items.length === 0 ? (
                    <span className="text-xs text-ink/40">No items yet</span>
                  ) : (
                    group.items.map((name) => (
                      <span
                        key={name}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${color.bg} ${color.text}`}
                      >
                        {name}
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() =>
                              void (isYou ? handleRemoveItem(name) : handleRemoveOtherItem(group.ownerId, name))
                            }
                            aria-label={`Remove ${name}`}
                            className="text-ink/40 hover:text-ink"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          {isHouseholdOwner && (
            <button
              type="button"
              onClick={() => void handleClearPantry()}
              className="self-start text-sm font-medium text-red-600 hover:text-red-700"
            >
              Clear pantry
            </button>
          )}
        </div>
      ) : (
        pantryNames.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pantryNames.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70"
              >
                {name}
                <button
                  type="button"
                  onClick={() => void handleRemoveItem(name)}
                  aria-label={`Remove ${name}`}
                  className="text-ink/40 hover:text-ink"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )
      )}

      {matches === null ? (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-ink">Checking your pantry...</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <RecipeCardSkeleton />
              </li>
            ))}
          </ul>
        </section>
      ) : matches.length === 0 ? (
        <p className="mt-6 text-ink/60">
          {pantryNames.length === 0 && !household
            ? "Add a few ingredients to see what you can make."
            : "No recipes match what's in your pantry yet."}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {readyToMake.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-ink">You can make these now</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {readyToMake.map((match) => (
                  <li key={match.id} style={{ viewTransitionName: `pantry-recipe-${match.id}` }}>
                    <RecipeCard recipe={match} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {closeMatches.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-ink">Close matches</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {closeMatches.map((match) => (
                  <li key={match.id} style={{ viewTransitionName: `pantry-recipe-${match.id}` }}>
                    <RecipeCard recipe={match} />
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                      <span className="text-sm text-ink/60">Missing:</span>
                      {missingIngredientNames(match, pantryNamesLower).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => void addIngredient(name)}
                          className="rounded-full border border-accent-200 px-2 py-0.5 text-xs text-ink/60 hover:bg-accent-50"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
