import { z } from 'zod';

export const ObjectIdStr = z.string().regex(/^[a-f\d]{24}$/i);
export type ObjectIdStr = z.infer<typeof ObjectIdStr>;

export const IsoDate = z.string().datetime();
export type IsoDate = z.infer<typeof IsoDate>;

export const OptionLetter = z.string().regex(/^[A-F]$/);
export type OptionLetter = z.infer<typeof OptionLetter>;
