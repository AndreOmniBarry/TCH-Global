// Sanity Studio schema for The Comforters Blog. Run `sanity init` in this
// folder (see README.md) to create the actual Studio project, then paste
// these type definitions in as-is.

export const post = {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (R: any) => R.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: (R: any) => R.required() },
    { name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3, description: 'Shown on the blog listing card and in link previews.' },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: ['Faith', 'Hope', 'Grace', 'Community', 'Family', 'Prayer', 'Testimony'] },
    },
    { name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true } },
    { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'author' }] },
    { name: 'publishedAt', title: 'Published At', type: 'datetime' },
    { name: 'readTime', title: 'Read Time', type: 'string', description: 'e.g. "6 min read" — set manually or compute from word count.' },
    {
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
        // Custom block for inline Bible references — renders as a tappable
        // verse lookup on the front end.
        {
          type: 'object',
          name: 'bibleVerse',
          title: 'Bible Verse Reference',
          fields: [{ name: 'reference', title: 'Reference (e.g. "John 3:16")', type: 'string' }],
        },
      ],
    },
  ],
};

export const author = {
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'image', title: 'Photo', type: 'image', options: { hotspot: true } },
  ],
};

export const announcement = {
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'body', title: 'Body', type: 'text' },
    { name: 'flyerImage', title: 'Flyer Image', type: 'image' },
    { name: 'startsAt', title: 'Starts At', type: 'datetime' },
    { name: 'endsAt', title: 'Ends At', type: 'datetime' },
    { name: 'link', title: 'Link (optional)', type: 'url' },
  ],
};

export const event = {
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (R: any) => R.required() },
    { name: 'description', title: 'Description', type: 'text', rows: 3 },
    { name: 'startsAt', title: 'Starts At', type: 'datetime', validation: (R: any) => R.required() },
    { name: 'endsAt', title: 'Ends At (optional)', type: 'datetime' },
    { name: 'location', title: 'Location', type: 'string', description: 'e.g. "Main Auditorium" or "Grace Dome Church" — leave blank to just show "TCH Global".' },
    { name: 'flyerImage', title: 'Flyer Image (optional)', type: 'image', options: { hotspot: true } },
    { name: 'link', title: 'Link (optional)', type: 'url', description: 'RSVP page, ticket link, or more-info page.' },
  ],
  orderings: [
    { title: 'Start Date, Soonest First', name: 'startsAtAsc', by: [{ field: 'startsAt', direction: 'asc' }] },
  ],
};

export const schemaTypes = [post, author, announcement, event];
