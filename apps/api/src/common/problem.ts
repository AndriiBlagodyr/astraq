import { applyDecorators } from '@nestjs/common';
import { ApiDefaultResponse } from '@nestjs/swagger';
import { ProblemSchema } from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class ProblemDto extends createZodDto(ProblemSchema) {}

/** Documents the problem-detail body every failed request returns. */
export function ApiProblemResponses() {
  return applyDecorators(
    ApiDefaultResponse({
      description: 'Any error, as an RFC 9457 problem detail',
      type: ProblemDto.Output,
    }),
  );
}
