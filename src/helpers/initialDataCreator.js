// Called from the welcome onboarding's "done" step. In the original WeekToDo
// this seeded a sample list; here we leave it as a no-op so the user lands on
// an empty workspace and starts clean. The entry point stays so the welcome
// flow does not break.
export default {
  create() {
    // intentionally empty: no seed data on first launch
  },
};
