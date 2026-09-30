create or replace function increment_review_likes(reviewid uuid)
returns void as $$
begin
  update product_reviews
  set likes_count = likes_count + 1
  where id = reviewid;
end;
$$ language plpgsql;

create or replace function decrement_review_likes(reviewid uuid)
returns void as $$
begin
  update product_reviews
  set likes_count = greatest(0, likes_count - 1)
  where id = reviewid;
end;
$$ language plpgsql;
