// import { Template, waitForURL } from "e2b";

// export const template = Template()
//   .fromNodeImage("22-slim")
//   .setWorkdir("/home/user/project")
//   .runCmd("npx create-next-app@latest . --yes")
//   .runCmd("npx shadcn@latest init  --silent -b neutral --template next --yes")
//   .runCmd("npx shadcn@latest add --all")
//   .setStartCmd("npx next --turbo", waitForURL("http://localhost:3000"));


import { Template, waitForURL } from "e2b";

export const template = Template()
  .fromNodeImage("22-slim")
  .setWorkdir("/home/user/project")
  .runCmd("npx --yes create-next-app@16.3.4 . --yes")
  .runCmd("npx --yes shadcn@4.21.0 init --silent --defaults")
  .runCmd("npx --yes shadcn@4.21.0 add --all --yes")
  .setStartCmd("npx next dev --turbopack", waitForURL("http://localhost:3000"));