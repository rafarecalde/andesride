import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );
  return rss({
    title: `${SITE.name} travel guide`,
    description:
      'Tips for getting to and from Quito airport (UIO): arrivals, families, meet & greet, costs, and safe, licensed transfers.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      categories: post.data.tags,
      link: `/guide/${post.slug}/`,
    })),
  });
}
