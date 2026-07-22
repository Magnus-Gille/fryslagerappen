# Edge Functions

`extract-inventory` accepts an authenticated multipart request containing a short audio clip,
a compressed base64 photo, or both. It verifies household membership before reading inventory
context and calling the extraction provider.

Set these project secrets before deployment:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase secrets set SAFETY_SALT=...
```

Optional model overrides:

```bash
supabase secrets set OPENAI_EXTRACTION_MODEL=gpt-5.6-luna
supabase secrets set OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

Deploy with JWT verification enabled (the default):

```bash
supabase functions deploy extract-inventory
```
