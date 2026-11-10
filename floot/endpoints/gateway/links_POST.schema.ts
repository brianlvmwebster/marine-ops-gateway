import {z} from 'zod';import {gatewayButtonsSchema} from '../../helpers/gatewayPolicy';export const schema=z.object({buttons:gatewayButtonsSchema,version:z.number().int().nonnegative()}).strict();
