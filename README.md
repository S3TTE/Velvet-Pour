# Velvet Pour

Velvet Pour è un progetto composto da un frontend mobile sviluppato con **React Native (Expo)** e un backend scritto in **Python** con un database **PostgreSQL** hostato su **Supabase**.

## Struttura del Progetto

- **Frontend**: React Native con Expo
- **Backend**: Python servito tramite WSGI con Apache
- **Database**: PostgreSQL su Supabase

## Prerequisiti

Assicurati di avere installati i seguenti strumenti:

- [Node.js](https://nodejs.org/) per il frontend
- [Python 3](https://www.python.org/) per il backend
- [Apache](https://httpd.apache.org/) con mod_wsgi abilitato

## Installazione e Avvio

L'intero progetto può essere avviato e gestito tramite **Apache** e il **Makefile** incluso.

### 1. Clona il repository
```sh
 git clone https://github.com/tuo-utente/velvet-pour.git
 cd velvet-pour
```

### 2. Configurazione del Backend

Il backend è servito tramite Apache con mod_wsgi. Assicurati di configurare un **VirtualHost** simile al seguente:

```apache
<VirtualHost *:80>
    ServerName velvetpour.local
    DocumentRoot /var/www/html/front

    WSGIDaemonProcess velvetpour python-home=/path/to/venv python-path=/var/www/html/backend
    WSGIScriptAlias /api /var/www/html/backend/wsgi.py

    <Directory /var/www/html/backend>
        <Files wsgi.py>
            Require all granted
        </Files>
    </Directory>
</VirtualHost>
```

Dopo aver configurato Apache, riavvia il servizio:
```sh
sudo systemctl restart apache2
```

### 3. Configurazione del Frontend

Compila il codice e spostalo nella cartella servita da Apache:
```sh
make build_front
make deploy_front
```

### 4. Configurazione del Database

Il database è hostato su Supabase. Modifica il file `.env` nella root del backend con i seguenti parametri:

```env
# Database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_db
POSTGRES_HOST=db.your-supabase-url.supabase.co
POSTGRES_PORT=5432
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_KEY=your-supabase-api-key
```

## Struttura delle Cartelle

```sh
velvet-pour/
│── backend/        # Codice del backend in Python
│── frontend/       # Codice del frontend in React Native (Expo)
│── Makefile        # Script di automazione
│── .env            # Variabili d'ambiente
│── README.md       # Documentazione del progetto
```

## Licenza

Questo progetto è distribuito sotto la licenza MIT. Per maggiori dettagli, consulta il file `LICENSE`.

