import { serve, Server } from "https://deno.land/std/http/server.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
//allows for websocket
import { acceptable, acceptWebSocket } from "https://deno.land/std@0.112.0/ws/mod.ts";

//Middleware to serve files
import { Application } from "https://deno.land/x/abc@v1.2.4/mod.ts";
const app = new Application();

//custom file handle all websocket reqs
import { game_background, get_game_info, wsManager } from "./wsManager.ts";

import "https://deno.land/x/dotenv/load.ts";

//Get port from env vars
let fire_rate: string = Deno.env.get("FIRE_RATE") ?? "400";
const PORT: number = parseInt(Deno.env.get("PORT") ?? "8080");
const dash_cooldown: string = (Deno.env.get("DASH_COOLDOWN") ?? "1000");
const dash_time: string = Deno.env.get("DASH_TIME") ?? "150";
const bullet_speed: string = Deno.env.get("BULLET_SPEED") ?? "15";
const bullet_despawn: string = Deno.env.get("BULLET_DESPAWN") ?? "5000";
const movement_speed: string = Deno.env.get("PLAYER_SPEED") ?? "5";
const game_title: string = Deno.env.get("GAME_TITLE") ?? "Multiplayer Test";
const title_font_size: string = Deno.env.get("TITLE_SIZE") ?? "150";

const p3_respawn: string = (Deno.env.get("RESPAWN_TIME") ?? "3000");
const p2_respawn: string =
  (Deno.env.get("2P_RESPAWN_TIME") ?? (parseInt(p3_respawn) / 2).toString());
const health_regen: string = (Deno.env.get("HEALTH_REGEN") ?? "0");

const server = serve({ port: PORT });
const socket_url = Deno.env.get("SOCKET_URL") || `ws://localhost:${PORT}/ws`;

const decoder = new TextDecoder("utf-8");

const index_html = decoder.decode(
  await Deno.readFile("./public/index.html"),
)
  .replace("%SOCKET_URL%", socket_url)
  .replace("%FIRE_RATE%", fire_rate)
  .replace("%DASH_COOLDOWN%", dash_cooldown)
  .replace("%DASH_TIME%", dash_time)
  .replace("%BULLET_DESPAWN%", bullet_despawn)
  .replace("%MOVE_SPEED%", movement_speed)
  .replace("%GAME_TITLE%", game_title)
  .replace("%P2_RESPAWN%", p2_respawn)
  .replace("%P3_RESPAWN%", p3_respawn)
  .replace("%TITLE_SIZE%", title_font_size)
  .replace("%HEALTH_REGEN%", health_regen);

console.log(socket_url);
console.log(`http://localhost:${PORT}`);

for await (const req of server) {
  try {
    if (req.url === "/ws") {
      if (acceptable(req)) {
        acceptWebSocket({
          conn: req.conn,
          bufReader: req.r,
          bufWriter: req.w,
          headers: req.headers,
        }).then(wsManager)
          .catch(async (err) => {
            console.error(`failed to accept websocket: ${err}`);
            await req.respond({ status: 400 });
          });
      }
    } else if (!req.url.includes("..")) { //send all non-websocket requests to the public folder
      if (req.url === "/" || req.url === "/index") {
        req.respond({
          status: 200,
          body: index_html,
        });
      } else if (req.url === "/info") {
        let info = get_game_info();
        let players: any[] = [];
        info.forEach((user) => {
          players.push(user.player);
        });
        req.respond({
          status: 200,
          // body: ,
          body: JSON.stringify(players),
        });
      } else {
        let status: number;
        if (existsSync(`./public${req.url}`)) {
          let file = await Deno.open(`./public${req.url}`);
          status = 200;
          req.respond({
            status: status,
            body: file,
          });
        } else {
          status = 404;
          req.respond({
            status: status,
            body: "file not found",
          });
        }
      }
    } else {
      req.respond({
        status: 401,
        body: "Forbidden",
      });
    }
  } catch {}
}
