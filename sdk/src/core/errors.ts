export interface MdanSourceLocation {
  line: number;
  column: number;
}

class MdanBaseError extends Error {
  readonly location: MdanSourceLocation | undefined;

  constructor(message: string, location?: MdanSourceLocation) {
    super(message);
    this.name = new.target.name;
    this.location = location;
  }
}

export class MdanParseError extends MdanBaseError {}

export class MdanValidationError extends MdanBaseError {}
