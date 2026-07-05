import sqlite3

def init_db():
    conn = sqlite3.connect("sanalite.db")
    cur = conn.cursor()

    # Personnel actuel
    cur.execute("""
    CREATE TABLE IF NOT EXISTS personnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT,
        fonction TEXT,
        specialite TEXT,
        experience INTEGER,
        statut TEXT
    )
    """)

    # Historique journalier (IMPORTANT)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS historique (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        total INTEGER,
        presents INTEGER,
        absents INTEGER,
        justifies INTEGER,
        data TEXT
    )
    """)

    conn.commit()
    conn.close()