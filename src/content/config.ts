import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    // Optional: a rates.json zone key. When set, the post's end CTA deep-links to
    // the booking widget with that zone preselected and shows its flat price.
    ctaZone: z.string().optional(),
  }),
});

export const collections = { blog };
