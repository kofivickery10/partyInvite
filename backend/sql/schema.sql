CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_settings (
  id INT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  event_date VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_choices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invite_name VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rsvps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invite_name_entered VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  matched_invite_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matched_invite_id) REFERENCES invites(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rsvp_children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rsvp_id INT NOT NULL,
  child_name VARCHAR(255) NOT NULL,
  food_choice_id INT NOT NULL,
  FOREIGN KEY (rsvp_id) REFERENCES rsvps(id) ON DELETE CASCADE,
  FOREIGN KEY (food_choice_id) REFERENCES food_choices(id) ON DELETE RESTRICT
);

INSERT INTO event_settings (id, title, event_date, location)
VALUES (1, 'Riley''s 5th Birthday', '28 March 2026', 'White Rock Primary School, Davies Ave, Paignton TQ4 7AW')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO food_choices (label, active)
VALUES ('Cheese', 1), ('Ham', 1), ('Sausage Roll', 1);
