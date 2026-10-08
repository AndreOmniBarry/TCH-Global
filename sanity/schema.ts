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
    { name: 'audience', title: 'Blog', type: 'string', options: { list: [{ title: 'Main blog', value: 'main' }, { title: 'Teens blog', value: 'teens' }] }, initialValue: 'main' },
    { name: 'coverImage', title: 'Cover Image', type: 'image', options: { hotspot: true } },
    { name: 'author', title: 'Author', type: 'reference', to: [{ type: 'author' }] },
    { name: 'publishedAt', title: 'Published At', type: 'datetime', description: 'Set a future date/time to schedule the post — it appears on the site automatically at that moment.' },
    { name: 'bodyHtml', title: 'Body (from /write)', type: 'text', readOnly: true, description: 'Filled automatically when a post is published from the /write editor.' },
    { name: 'coverImageUrl', title: 'Cover Image URL (from /write)', type: 'url' },
    { name: 'authorName', title: 'Author Name (from /write)', type: 'string' },
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
    { name: 'flyerUrl', title: 'Flyer link (set from /write)', type: 'url', hidden: true },
  ],
  orderings: [
    { title: 'Start Date, Soonest First', name: 'startsAtAsc', by: [{ field: 'startsAt', direction: 'asc' }] },
  ],
};

export const testimony = {
  name: 'testimony',
  title: 'Testimony',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string', description: 'How to credit them, e.g. "Grace A." — full names optional, member\'s call.', validation: (R: any) => R.required() },
    { name: 'quote', title: 'Testimony', type: 'text', rows: 4, validation: (R: any) => R.required() },
    { name: 'image', title: 'Photo (optional)', type: 'image', options: { hotspot: true } },
    { name: 'submittedAt', title: 'Date', type: 'datetime' },
    { name: 'category', title: 'Category', type: 'string', options: { list: ['Healing', 'Provision', 'Deliverance', 'Family', 'Breakthrough', 'Salvation', 'Other'] } },
    { name: 'featured', title: 'Miracle / highlight', type: 'boolean', description: 'Shows in the Miracles spotlight on the homepage.', initialValue: false },
  ],
  orderings: [
    { title: 'Newest First', name: 'submittedAtDesc', by: [{ field: 'submittedAt', direction: 'desc' }] },
  ],
};

// PUDLIB! — Pastor Uzor Digital Library
export const audioMessage = {
  name: 'audioMessage',
  title: 'PUDLIB! Audio',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (R: any) => R.required() },
    { name: 'audioFile', title: 'Audio file (MP3)', type: 'file', options: { accept: 'audio/*' }, description: 'Upload the MP3 here — or paste a link below instead.' },
    { name: 'audioUrl', title: 'Audio link (optional)', type: 'url', description: 'A direct MP3 link (e.g. from Spotify for Podcasters / Anchor RSS) if not uploading.' },
    { name: 'series', title: 'Series (optional)', type: 'string', description: 'Messages in the same series are recommended together.' },
    { name: 'cover', title: 'Cover art (optional)', type: 'image' },
    { name: 'description', title: 'Description', type: 'text', rows: 3 },
    { name: 'publishedAt', title: 'Date', type: 'datetime' },
  ],
  orderings: [{ title: 'Newest First', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
};

export const book = {
  name: 'book',
  title: 'PUDLIB! Book',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (R: any) => R.required() },
    { name: 'cover', title: 'Cover', type: 'image', validation: (R: any) => R.required() },
    { name: 'description', title: 'Description', type: 'text', rows: 4 },
    { name: 'price', title: 'Price (e.g. "₦5,000")', type: 'string' },
    { name: 'orderLink', title: 'Order link (optional)', type: 'url', description: 'WhatsApp, store or form link. Leave blank to order by email.' },
    { name: 'featured', title: 'Feature on the homepage', type: 'boolean' },
    { name: 'publishedAt', title: 'Release date', type: 'datetime' },
  ],
};

export const spotlight = {
  name: 'spotlight',
  title: 'Hero Spotlight',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (R: any) => R.required() },
    { name: 'kind', title: 'Type', type: 'string', options: { list: ['Event', 'Announcement', 'Programme', 'Banner'] }, initialValue: 'Event' },
    { name: 'subtitle', title: 'Short line', type: 'string' },
    { name: 'image', title: 'Image / flyer', type: 'image', options: { hotspot: true } },
    { name: 'eventDate', title: 'Date (optional)', type: 'datetime' },
    { name: 'showFrom', title: 'Show from', type: 'datetime' },
    { name: 'showUntil', title: 'Show until', type: 'datetime' },
    { name: 'link', title: 'Button link', type: 'string' },
    { name: 'linkLabel', title: 'Button text', type: 'string' },
    { name: 'order', title: 'Order', type: 'number' },
    { name: 'hidden', title: 'Hidden', type: 'boolean', initialValue: false },
  ],
};

export const schemaTypes = [post, author, announcement, event, testimony, audioMessage, book, spotlight];
