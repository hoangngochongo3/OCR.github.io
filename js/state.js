// Shared mutable state for loaded images across CCCD and BHYT modules
export const imageState = {
  frontB64:  null,
  frontMime: null,
  backB64:   null,
  backMime:  null,
  bhytB64:   null,
  bhytMime:  null,
};

// Service account credentials loaded by the user at runtime (never stored)
export const saState = {
  sa: null, // { client_email, private_key }
};
