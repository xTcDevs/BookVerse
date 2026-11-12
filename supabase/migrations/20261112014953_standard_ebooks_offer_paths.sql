-- Real Standard Ebooks links name the file after the book
-- (downloads/fergus-hume_the-green-mummy.epub) and translated editions add a translator
-- segment (ebooks/leo-tolstoy/war-and-peace/louise-maude_aylmer-maude/...). Keep offers
-- pinned to standardebooks.org's reading and download paths while allowing those shapes.
alter table public.offers drop constraint standard_ebooks_offer_origin;
alter table public.offers
  add constraint standard_ebooks_offer_origin
  check (
    provider <> 'Standard Ebooks'
    or (
      url is not null
      and url ~ '^https://standardebooks\.org/ebooks/[a-z0-9_-]+(/[a-z0-9_-]+){1,3}/(text/single-page|downloads/[a-z0-9_-]+\.epub)$'
    )
  );
