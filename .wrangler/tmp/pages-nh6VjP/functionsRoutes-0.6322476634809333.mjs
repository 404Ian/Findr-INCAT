import { onRequest as __api___route___ts_onRequest } from "C:\\Users\\acer\\Desktop\\coding projects\\webs\\qr-code\\functions\\api\\[[route]].ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  ]