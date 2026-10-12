import M from "../../../src/features/spaces/model/core";

// ACCOUNT-01: successful create/join flows start with no current membership.
// This fixture represents a separate account scenario, not deletion in a user flow.
export function accountWithoutTeam() {
  const state = M.seed();
  state.spaces = state.spaces.filter(w => w.type === "personal");
  state.devices = state.devices.filter(d => d.spaceId === "personal");
  state.activeId = "personal";
  return state;
}
