INSERT INTO "about_us" ("id", "title", "description", "sort_order")
SELECT defaults."id", defaults."title", defaults."description", defaults."sort_order"
FROM (
    VALUES
        ('7d44ea45-ef03-4d39-88a1-f1a2cc0f41a1', 'Our Mission', 'We strive innovative solutions that help people work more efficiently and achieve more.', 0),
        ('7d44ea45-ef03-4d39-88a1-f1a2cc0f41a2', 'Our Values', 'Innovation, collaboration, and customer focus are at the core of everything we do.', 1),
        ('7d44ea45-ef03-4d39-88a1-f1a2cc0f41a3', 'Our Team', 'A talented team of professionals working together to build the future.', 2),
        ('7d44ea45-ef03-4d39-88a1-f1a2cc0f41a4', 'Our Achievements', 'We’ve achieved great results and continue to reach new heights.', 3)
) AS defaults("id", "title", "description", "sort_order")
WHERE NOT EXISTS (
    SELECT 1 FROM "about_us" AS existing WHERE existing."title" = defaults."title"
);
