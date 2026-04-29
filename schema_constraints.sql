ALTER TABLE streets
ADD PRIMARY KEY (street_id);

ALTER TABLE cyclable
ADD CONSTRAINT fk_cyclable
FOREIGN KEY (street_id)
REFERENCES streets(street_id);

ALTER TABLE transport
ADD CONSTRAINT fk_transport
FOREIGN KEY (street_id)
REFERENCES streets(street_id);

ALTER TABLE connectivite
ADD CONSTRAINT fk_connect
FOREIGN KEY (street_id)
REFERENCES streets(street_id);

ALTER TABLE marche
ADD CONSTRAINT fk_marche
FOREIGN KEY (street_id)
REFERENCES streets(street_id);