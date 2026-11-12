-- Only for databases created before gift shapes existed; schema.sql already includes this column.
ALTER TABLE gifts ADD COLUMN shape TEXT NOT NULL DEFAULT 'box' CHECK (shape IN ('box', 'ornament'));
