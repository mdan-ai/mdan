import http from "node:http";

export interface ListenResult {
  port: number;
}

export async function listenWithFallback(server: http.Server, host: string, preferredPort: number): Promise<ListenResult> {
  function listen(port: number): Promise<ListenResult> {
    return new Promise<ListenResult>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Expected TCP server address."));
          return;
        }
        resolve({ port: address.port });
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, host);
    });
  }

  try {
    return await listen(preferredPort);
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code !== "EADDRINUSE" || preferredPort === 0) {
      throw error;
    }
    return listen(0);
  }
}
