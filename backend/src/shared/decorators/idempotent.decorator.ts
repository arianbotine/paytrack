import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para marcar endpoints como idempotentes.
 * Endpoints marcados com @Idempotent() exigem header 'idempotency-key'
 * e garantem que requests duplicados retornem o mesmo resultado.
 */
export const IDEMPOTENT_KEY = 'idempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
