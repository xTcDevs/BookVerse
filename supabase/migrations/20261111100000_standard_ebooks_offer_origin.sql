-- Standard Ebooks feed links are untrusted input. Keep imported offers on the
-- publisher's canonical reading and download paths, even if a feed entry is malformed.
alter table public.offers
  add constraint standard_ebooks_offer_origin
  check (
    provider <> 'Standard Ebooks'
    or (
      url is not null
      and url ~ '^https://standardebooks\\.org/ebooks/[a-z0-9-]+/[a-z0-9-]+/(text/single-page|downloads/book\\.epub)$'
    )
  );
