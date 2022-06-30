USE coworking;

CREATE TABLE data (
    _id bigint primary key identity,
    users nvarchar(max),
	properties nvarchar(max),
	property_id bigint,
	workspace_id bigint
);

INSERT INTO data (users, properties, property_id, workspace_id) VALUES ('[]', '{}', 0, 0);

SELECT users, properties, property_id, workspace_id FROM data WHERE _id = 1;