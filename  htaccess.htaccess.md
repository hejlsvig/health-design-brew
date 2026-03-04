<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /Testlab/testlab-deploy/

  # If the request is not for an existing file or directory, serve index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [QSA,L]
</IfModule>
