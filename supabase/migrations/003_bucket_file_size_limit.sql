-- Rode isto no SQL Editor do seu projeto Supabase.
-- Alguns romsets de Neo Geo passam de 80MB — o limite padrão de upload do
-- bucket pode ser menor que isso e recusar o arquivo. Isto só aumenta o teto
-- de tamanho por arquivo, não muda nada de RLS/segurança.
update storage.buckets
set file_size_limit = 209715200 -- 200MB por arquivo
where id = 'roms';
