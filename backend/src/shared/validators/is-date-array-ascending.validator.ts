import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validador customizado para verificar se um array de datas (strings ISO)
 * está em ordem crescente.
 */
@ValidatorConstraint({ name: 'isDateArrayAscending', async: false })
export class IsDateArrayAscendingConstraint implements ValidatorConstraintInterface {
  validate(dateArray: string[], args: ValidationArguments) {
    if (!Array.isArray(dateArray) || dateArray.length === 0) {
      return true; // Deixa outras validações (@IsArray, @ArrayMinSize) lidarem com isso
    }

    // Verificar se todas as datas são válidas e estão em ordem crescente
    for (let i = 0; i < dateArray.length - 1; i++) {
      const currentDate = new Date(dateArray[i]);
      const nextDate = new Date(dateArray[i + 1]);

      // Verificar se as datas são válidas
      if (
        Number.isNaN(currentDate.getTime()) ||
        Number.isNaN(nextDate.getTime())
      ) {
        return false;
      }

      // Verificar ordem crescente
      if (currentDate.getTime() >= nextDate.getTime()) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'As datas de vencimento devem estar em ordem crescente';
  }
}
