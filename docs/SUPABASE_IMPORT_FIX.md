# Supabase import compatibility

The browser Supabase client is defined in:

```text
lib/supabase.ts
```

The recommended import is:

```ts
import { supabase } from "@/lib/supabase";
```

For compatibility with code that expects the client under the App Router,
`app/lib/supabase.ts` re-exports the same singleton. This import is also valid:

```ts
import { supabase } from "@/app/lib/supabase";
```

`tsconfig.json` now explicitly sets `baseUrl` to the project root and maps
`@/*` to `./*`, so both paths resolve consistently in Next.js, TypeScript,
and VS Code.

After extracting the project, install dependencies and clear old Next.js cache:

```bash
npm install
rm -rf .next
npm run check
```

On Windows PowerShell, use:

```powershell
npm install
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run check
```
