
# Bisca Online - Card game
A real-time multiplayer WebApp for playing a trick-taking card game based on the "Bisca" rules (a variant of italian Briscola). Built with **React**, **Node.js**, and **Socket.io**.

The game is fully responsive and optimized to be played across Desktop, Mobile, and Tablet devices.

## Game Rules

The game uses a standard 40-card deck. Players start with a set number of lives (default is 3 to 5).

### 1. Game Structure

The game consists of several Rounds.

In the first round, players are dealt 5 cards. In subsequent rounds, the number of cards decreases: 5 -> 4 -> 3 -> 2 -> 1.

Each round is divided into 3 phases:

1.  **Bidding Phase:**
    
    -   Each player declares how many "tricks" (hands) they intend to win in the current round.
        
    -   **Restriction:** The last player to bid _cannot_ choose a number that makes the sum of all bids equal to the number of cards in hand (e.g., if players have 5 cards and previous bids sum up to 4, the last player cannot bid 1). This is made to ensure that at least one life is lost during each round.
        
2.  **Playing Phase:**
    
    -   Standard trick-taking mechanics apply, but with an **absolute hierarchy** of suits and values.
        
    -   **Suit Order (Highest to Lowest):** Denari (Coins)  > Coppe (Cups) > Spade (Swords)  > Bastoni (Clubs) .
        
    -   **Value Order:** King > Knight > Jack > 7 > 6 > 5 > 4 > 3 > 2 > Ace.
        
    -   _Special Rule:_ The **Ace of Denari** is a wildcard. When played, the user must choose to play it as **"High"** (wins against everything) or **"Low"** (loses against everything).
        
3.  **Life Calculation:**
    
    -   At the end of the round, the actual tricks won are compared to the initial bid.
        
    -   For every trick difference (too many or too few), the player loses 1 life.
        
    -   Reaching <= 0 lives results in elimination (the player can continue watching as a spectator).
        

### 2. Special Round (Blind Round)

When the game reaches the round with **only 1 card**:

-   Players can see everyone else's card but **cannot see their own** (they see the card back).
    
-   Bidding is done "blind", just by looking at opponents' cards.
    
-   If a player unknowingly holds the Ace of Denari in this round, the server automatically calculates whether to play it as "High" or "Low" to match the player's bid.
    

----------

## Tech Stack

-   **Frontend:** React (Vite), TailwindCSS v3.
    
-   **Backend:** Node.js, Express, Socket.io.
        

----------

## Installation & Hosting Guide

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18 or higher recommended).
    

### 1. Backend Setup (Server)

Open a terminal, navigate to the `server` folder, and install dependencies:

 

```
cd server
npm install

```

Start the server:

 

```
node index.js

```

_The server default port is **3001**._

### 2. Frontend Setup (Client)

Open a **new terminal window**, navigate to the `client` folder, and install dependencies:

 

```
cd client
npm install

```

#### Environment Variables Configuration

In order to host it both on the internet or your local network, you must specify your domain or your computer's local IP address. **If you skip this, Vite will default to localhost, and external devices won't be able to connect.**

1.  Inside the `client` folder, create a file named **`.env`**.
    
2.  Find your local IP address or domain
        
3.  Paste the following content into the `.env` file:
    
```
VITE_SOCKET_URL=http://YOUR_LOCAL_IP_OR_DOMAIN:3001
VITE_ALLOWED_HOST=YOUR_DOMAIN

```

Example:

VITE_SOCKET_URL=http://192.168.1.1:3001

#### Start the Frontend

Once the `.env` is configured, start the client:

```
npm run dev
```
This will start the client on the default Vite port which is 5173. This is not the recommended way of self-hosting this webapp, you should instead:

1. Build the project
```
npm run build
```
This will create a dist/ folder inside the client/ folder which will contain all static html/js files.

2. Copy client/dist/* into /var/www/cardgame/dist/ and use a webserver such as nginx to provide those files

## Installing on armbian
If your installation of nodejs on armbian is outdated, upgrade it using NVM
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
```
Then install the latest nodejs version
```
nvm install 22
nvm use 22
nvm alias default 22
```
If there's a server uuid error:
```
npm uninstall uuid
npm install uuid@9.0.1
```
If you mistakenly executed "sudo npm install" instead of "npm install":
```
sudo chown -R $USER:$USER yourpath/cardgame/v2/client
sudo rm -rf yourpath/cardgame/v2/client/node_modules/.vite
npm run dev
