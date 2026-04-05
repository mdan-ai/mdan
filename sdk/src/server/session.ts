import type { MdanSessionMutation, MdanSessionSnapshot } from "./types.js";

export function signIn(session: MdanSessionSnapshot): MdanSessionMutation {
  return {
    type: "sign-in",
    session
  };
}

export function refreshSession(session: MdanSessionSnapshot): MdanSessionMutation {
  return {
    type: "refresh",
    session
  };
}

export function signOut(): MdanSessionMutation {
  return {
    type: "sign-out"
  };
}
