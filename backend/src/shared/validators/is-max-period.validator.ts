import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsMaxPeriod', async: false })
export class IsMaxPeriodConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments): boolean {
    const object = args.object as any;
    const startDate = object.startDate;

    if (!startDate || !endDate) {
      return true; // Skip validation if either date is missing
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate difference in days
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Maximum 365 days (1 year)
    return diffDays <= 365;
  }

  defaultMessage(): string {
    return 'Período máximo permitido é de 1 ano';
  }
}

export function IsMaxPeriod(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMaxPeriodConstraint,
    });
  };
}
