export interface ReadableSurfaceSemanticSlotOptions {
  requireOnPage?: boolean;
  requireOnBlock?: boolean;
}

export interface ReadableSurfaceValidationOptions {
  appId?: string;
  semanticSlots?: boolean | ReadableSurfaceSemanticSlotOptions;
}
