# Pezi Bot

Welcome to **Pezi Bot**, the ultimate chatbot for your Twitch channel! **Pezi Bot** is designed to enhance your viewers' experience by providing a fun and engaging environment for them to interact in. With **Pezi Bot**'s pointing system, your viewers can earn points for watching, chatting, and participating in your streams. These points can then be used to redeem rewards or play exciting minigames like trivia, flip, dice or slots.

**Pezi Bot**'s minigames offer a chance for your viewers to win even more points and compete against each other for the top spot on the leaderboard. Whether you're a seasoned streamer or just starting out, **Pezi Bot** is the perfect addition to your channel to keep your audience engaged and entertained. So why wait? Let **Pezi Bot** join your chat today and see the fun and excitement it can bring to your Twitch community!

# Installation

1. Install Node version 18.16.0 or higher
2. Run `npm install` inside the terminal
3. Create a file .env into the root directory of the project consisting:

```bash
bot_streamer="bare7a"
bot_username="pezi_bot"
bot_password="oauth:abcdefghi12jkllmnop34qr5stuvwx"
bot_client_id="ab123cdefghijklmn4o567pq8st9u"
bot_access_token="1abcdefghijklmnopqr23stuvw4xy4"
bot_refresh_token="a1bcdef23ghijk4lmnop5qr6st7uvwxyzabc8defghijk8lmno"
bot_currency_name="points"
bot_default_points="100"
```

- **bot_streamer** - Username of the streamer of which the bot will be running in
- **bot_username** - Bot's username
- **bot_password** - Oath token for the bot for connecting to the Twitch chat
- **bot_client_id** - Id of the bot
- **bot_access_token** - Access token for calling the API's
- **bot_refresh_token** - Refresh token for updating the access token
- **bot_currency_name** - Name of the currency that the bot will use
- **bot_default_points** - Initial points that the new users will start with

You can use: https://twitchtokengenerator.com/ for **bot_client_id**, **bot_access_token** and **bot_refresh_token**
You can use: https://twitchapps.com/tmi/ for generating **bot_password**

4. Run `npm run build` to compile
5. Run `npm run start` to start the application

# Mini Games

## Coin

- Enable/Disable using the command when the stream is offline
- Enable/Disable using custom betting ammounts
- Enable/Disable cooldown / user cooldown
- Enable/Disable cooldown / user cooldown messages
- Customisable command name
- Customisable permission for using the command
- Customisable winning and loosing emote
- Customisable winning multiplier
- Customisable cooldown / user cooldown timers
- Customisable response messages

## Dice

- Enable/Disable using the command when the stream is offline
- Enable/Disable using custom betting amounts
- Enable/Disable cooldown / user cooldown
- Enable/Disable cooldown / user cooldown messages
- Customisable command name
- Customisable permission for using the command
- Customisable winning multipliers
- Customisable cooldown / user cooldown timers
- Customisable response messages

## Raffle

- Enable/Disable using the command when the stream is online
- Customisable command name
- Customisable permission for using the command
- Customisable min/max betting ammounts
- Customizable raffle cycle time
- Customisable betting time
- Customisable response messages

## Slots

- Enable/Disable using the command when the stream is offline
- Enable/Disable using custom betting amounts
- Enable/Disable cooldown / user cooldown
- Enable/Disable cooldown / user cooldown messages
- Customisable command name
- Customisable permission for using the command
- Customisable emoticons
- Customisable super jackpot emoticon
- Customisable winning multipliers
- Customisable cooldown / user cooldown timers
- Customisable response messages

## Trivia

- Enable/Disable the minigame when the stream is offline
- Enable/Disable case sensitivity for the given answer
- Enable/Disable fast question switch on correct answer
- Enable/Disable showing the right answer if nobody answered the question
- Multiple answers support
- Customisable questions/answers list
- Customisable permission for participating
- Customisable winning rewards (min-max)
- Customisable timers for switching the questions (min-max)
- Customisable response messages

# Crons

## Stream Status

- Automatically updates the stream's online status
- Customisable polling time

## View Rewards

- Automatically gives rewards to the people connected to the chat
- Customisable rewards based on user roles and viewership
- Customisable rewards based on user roles and chat interaction
- Customisable polling time

# Utility Commands

## Admin

- Add or Remove person from the permissions group
- Customisable permission for using
- Customisable response messages

## Cmd

- Enable/Disable command
- Modify command's user/global cooldown
- Customisable permission for using
- Customisable response messages

## Note

- Add/Set/Remove a message quote
- Enable/Disable a message quote
- Modify message's user/global cooldown
- Customisable permission for using
- Customisable response messages

## Points

- Message regarding the current user points
- Message regarding the top 10 user with most points
- Admin Add/Set/Remove points from user
- Customisable permission for using
- Customisable response messages

## Stats

- Details regarding how much points is the user ahead or behind
- Customisable permission for using
- Customisable response messages

# Utility Scripts

## Configurator

- Exports all of the user, commands and crons content from the database to a JSON file
- Imports all of the user, commands and crons content to the database from a JSON file
