SET search_path TO app, public;

INSERT INTO app.category(name) VALUES ('Getränke'),('Snacks'),('Hauptgerichte')
    ON CONFLICT DO NOTHING;

INSERT INTO app.allergen(code, name) VALUES
                                         ('A','Gluten'),('B','Krebstiere'),('C','Eier'),('D','Fisch'),
                                         ('E','Erdnüsse'),('F','Soja'),('G','Milch'),('H','Schalenfrüchte')
    ON CONFLICT DO NOTHING;

INSERT INTO app.user_class(name) VALUES ('1A'),('1B'),('2A')
    ON CONFLICT DO NOTHING;
