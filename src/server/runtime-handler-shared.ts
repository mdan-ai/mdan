export interface ValidatedEnvelopeExecutionOptions<TResult, TEnvelope, TResponse> {
  execute(): TResult | Promise<TResult>;
  invalidContractDetail: string;
  createInternalErrorResponse(): TResponse;
  createInvalidContractResponse(detail: string): TResponse;
  validateEnvelope(envelope: TEnvelope): TResponse | null;
  isEnvelope(result: unknown): result is TEnvelope;
  skipValidation?(result: TResult): boolean;
}

export type ValidatedEnvelopeExecutionResult<TResult, TResponse> =
  | {
      response: TResponse;
      result?: never;
    }
  | {
      response?: never;
      result: TResult;
    };

export async function executeValidatedEnvelopeHandler<TResult, TEnvelope, TResponse>(
  options: ValidatedEnvelopeExecutionOptions<TResult, TEnvelope, TResponse>
): Promise<ValidatedEnvelopeExecutionResult<TResult, TResponse>> {
  let result: TResult;
  try {
    result = await Promise.resolve(options.execute());
  } catch {
    return {
      response: options.createInternalErrorResponse()
    };
  }

  if (options.skipValidation?.(result) === true) {
    return { result };
  }

  if (!options.isEnvelope(result)) {
    return {
      response: options.createInvalidContractResponse(options.invalidContractDetail)
    };
  }

  const validationError = options.validateEnvelope(result);
  if (validationError) {
    return {
      response: validationError
    };
  }

  return { result };
}
