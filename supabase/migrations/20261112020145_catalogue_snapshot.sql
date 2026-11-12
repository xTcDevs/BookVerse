-- The site is pre-rendered at deploy time from one read of the published catalogue.
-- Security invoker: row-level security decides what is returned, so visitors (and the
-- build, which uses the public key) only ever receive published records.
create or replace function public.catalogue_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'sources', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'name', s.name, 'homepage', s.homepage_url, 'termsUrl', s.terms_url,
        'attribution', s.attribution_text) order by s.id)
      from public.sources s), '[]'::jsonb),
    'contributors', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'name', c.name, 'born', c.birth_year, 'died', c.death_year,
        'datesSourceUrl', c.dates_source_url) order by c.slug)
      from public.contributors c), '[]'::jsonb),
    'works', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', w.slug,
        'title', w.title,
        'subtitle', w.subtitle,
        'kind', w.kind,
        'originalLanguage', w.original_language,
        'firstPublishedYear', w.first_published_year,
        'description', case when w.description is null then null else jsonb_build_object(
          'text', w.description, 'license', w.description_license, 'sourceUrl', w.description_source_url) end,
        'subjects', to_jsonb(w.subjects),
        'genres', coalesce((select jsonb_agg(g.slug order by wg.is_primary desc, g.sort)
                            from public.work_genres wg join public.genres g on g.id = wg.genre_id
                            where wg.work_id = w.id), '[]'::jsonb),
        'contributors', coalesce((select jsonb_agg(jsonb_build_object('slug', c.slug, 'role', wc.role)
                                    order by wc.position)
                                  from public.work_contributors wc join public.contributors c on c.id = wc.contributor_id
                                  where wc.work_id = w.id), '[]'::jsonb),
        'rights', coalesce((select jsonb_agg(jsonb_build_object(
                              'territory', r.territory, 'status', r.status, 'basis', r.basis,
                              'evidenceUrl', r.evidence_url, 'determinedOn', r.determined_on) order by r.territory)
                            from public.work_rights r where r.work_id = w.id), '[]'::jsonb),
        'editions', coalesce((select jsonb_agg(jsonb_build_object(
            'id', e.id,
            'format', e.format,
            'language', e.language,
            'publisher', e.publisher,
            'publishedYear', e.published_year,
            'source', s.slug,
            'sourceUrl', e.source_url,
            'retrievedAt', e.retrieved_at,
            'contributors', coalesce((select jsonb_agg(jsonb_build_object('slug', c.slug, 'role', ec.role))
                                      from public.edition_contributors ec join public.contributors c on c.id = ec.contributor_id
                                      where ec.edition_id = e.id), '[]'::jsonb),
            'offers', coalesce((select jsonb_agg(jsonb_build_object(
                                  'access', o.access, 'license', o.license, 'provider', o.provider,
                                  'url', o.url, 'isOfficial', o.is_official) order by o.access)
                                from public.offers o where o.edition_id = e.id), '[]'::jsonb))
            order by e.published_year nulls last, e.id)
          from public.editions e left join public.sources s on s.id = e.source_id
          where e.work_id = w.id), '[]'::jsonb),
        'publishedAt', w.published_at) order by w.title, w.slug)
      from public.works w), '[]'::jsonb)
  )
$$;
revoke execute on function public.catalogue_snapshot() from public;
grant execute on function public.catalogue_snapshot() to anon, authenticated;
