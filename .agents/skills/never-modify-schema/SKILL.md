---
name: never-modify-schema
description: Usa cuando edites, crees o escribas database/schema.sql (o cualquier archivo de BD de base) en AppResidenciaAerodynamics. Nunca modifiques schema.sql; los cambios de estructura de la BD se aplican SOLO mediante migraciones (modificaciones*.sql + migrate-*.js).
disable-model-invocation: false
---

# Nunca modificar schema.sql

En el proyecto `AppResidenciaAerodynamics`, `database/schema.sql` es la
estructura base de la base de datos y NO debe editarse.

## Regla

- **Prohibido** editar, reescribir o regenerar `database/schema.sql` (ni ningún
  archivo de BD "de base": `schema.sql`, ficheros base similares).
- Si el usuario pide un cambio de estructura de la BD, NUNCA tocar `schema.sql`.
- Los cambios de estructura se aplican SOLO mediante migraciones:
  - `database/modificaciones<fecha>.sql` (un SQL por día/por cambio), y
  - el runner JS asociado `database/migrate-*.js` que lo ejecuta.
- No se debe añadir al commit ningún cambio en `schema.sql`.
- Si `schema.sql` está modificado en el working tree, restaurarlo a su estado
  base desde git antes de cualquier commit, y avisar al usuario.

## Procedimiento cuando se pide un cambio de BD

1. Aceptar el cambio como un SQL de migración nuevo
   (ej. `database/modificaciones<fecha>.sql`).
2. Añadir (o actualizar) un runner idempotente `database/migrate-*.js`
   que lo ejecute con `node database/migrate-*.js`.
3. Verificar `node --check database/migrate-*.js`.
4. NO tocar `database/schema.sql`. Dejarlo exactamente como estaba.
5. Antes del commit: comprobar con `git status` que `schema.sql` no aparece
   como modificado. Si aparece, restaurarlo
   (`git checkout HEAD -- database/schema.sql`) y avisar al usuario.

## Ejemplo válido (migración en vez de schema.sql)

```text
database/modificaciones08-08-2026.sql   <- cambios de estructura del día
database/migrate-modifications-07-08-agosto-2026.js  <- runner que los aplica
```

## Ejemplo prohibido

```text
database/schema.sql   <- NO SE TOCA NUNCA
```
