-- supabase/migrations/YYYYMMDDHHMMSS_create_bottleneck_rpc.sql

-- Function to get items that have been in their current stage the longest
create or replace function get_bottleneck_items (
  p_org_id uuid,
  p_limit int default 10
)
returns table (
  item_id uuid,
  sku text,
  order_id uuid,
  order_number text,
  stage_id uuid,
  stage_name text,
  sub_stage_id uuid,
  sub_stage_name text,
  entered_at timestamptz,
  time_in_stage interval
)
language sql
stable
parallel safe
as $$
  with latest_history as (
    select
        ih.item_id,
        ih.stage_id,
        ih.sub_stage_id,
        ih.entered_at,
        -- Use row_number to pick the latest entry per item
        row_number() over(partition by ih.item_id order by ih.entered_at desc) as rn
    from item_history ih
    where ih.organization_id = p_org_id
  )
  select
      i.id as item_id,
      i.sku,
      i.order_id,
      o.order_number,
      i.current_stage_id as stage_id,
      ws.name as stage_name,
      i.current_sub_stage_id as sub_stage_id,
      wss.name as sub_stage_name,
      lh.entered_at,
      -- Calculate time difference
      now() - lh.entered_at as time_in_stage
  from items i
  -- Join with the latest history entry for the item
  join latest_history lh on i.id = lh.item_id and lh.rn = 1
  -- Join other necessary tables
  join orders o on i.order_id = o.id
  join workflow_stages ws on i.current_stage_id = ws.id
  left join workflow_sub_stages wss on i.current_sub_stage_id = wss.id
  where
    i.organization_id = p_org_id
    -- Only include active items (not completed)
    and i.completed_at is null
  -- Order by the calculated time in stage, descending
  order by time_in_stage desc
  limit p_limit;
$$; 