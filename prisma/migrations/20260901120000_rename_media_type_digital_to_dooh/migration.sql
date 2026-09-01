-- PR0: Rename OOH catalog type token digital → dooh (Media.type)
-- Rollback: UPDATE media SET type = 'digital' WHERE type = 'dooh';

UPDATE media SET type = 'dooh' WHERE type = 'digital';
