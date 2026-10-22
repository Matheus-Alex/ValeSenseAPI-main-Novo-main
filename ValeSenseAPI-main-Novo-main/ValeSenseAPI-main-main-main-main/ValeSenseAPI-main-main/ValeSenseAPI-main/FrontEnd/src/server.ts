import { app } from "./app.js";
import { env } from "./config/env.js";
import { seedInitialAdmin } from "./modules/auth/user.repository.js";

await seedInitialAdmin();
app.listen(env.PORT, () => console.log(`ValeSense API disponível em http://localhost:${env.PORT}`));
