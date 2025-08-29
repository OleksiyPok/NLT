# Project Structure and Dependencies

## Dependency Diagram

```mermaid
flowchart TD
  UI --> App
  State --> App
  App --> State
  App --> Playback
  App --> Speaker

  Playback --> State
  Playback --> Speaker

  Config --> App
  Storage --> App
  Utils --> App

  Speaker -->|uses voices| App
```

## Modules
- **State**: centralized store with pub/sub.
- **UI**: DOM elements, events, updates.
- **Speaker**: wrapper for speechSynthesis.
- **Playback**: business logic of playing text.
- **Config**: default settings, config loading.
- **Storage**: localStorage integration.
- **Utils**: helper functions.
- **App**: root controller wiring modules.
