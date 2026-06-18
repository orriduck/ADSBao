export class AirportDirectoryConfigurationError extends Error {
  status: number;

  constructor(message = "OpenAIP airport data is not configured") {
    super(message);
    this.name = "AirportDirectoryConfigurationError";
    this.status = 503;
  }
}
