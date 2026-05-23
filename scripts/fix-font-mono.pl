#!/usr/bin/env perl
use strict;
use warnings;
use File::Find;

my $ROOT = $ARGV[0] // '.';
my @SKIP = qw(
  developers/page.tsx
  media-json-edit-client.tsx
  admin-medias-import-client.tsx
  markdown-body.tsx
  my-api-keys-page-client.tsx
);

sub should_skip {
  my ($path) = @_;
  for my $s (@SKIP) {
    return 1 if index($path, $s) >= 0;
  }
  return 0;
}

sub fix_line {
  my ($line, $skip_remove) = @_;
  return $line if $line =~ /<pre[\s>]|<\/pre>|<code[\s>]|<\/code>/;

  $line =~ s/font-mono font-bold uppercase tracking-\[0\.18em\]/font-display font-bold uppercase tracking-[0.18em]/g;
  $line =~ s/font-mono font-bold uppercase tracking-\[0\.2em\]/font-display font-medium uppercase tracking-[0.2em]/g;
  $line =~ s/font-mono font-bold uppercase tracking-\[0\.22em\]/font-display font-medium uppercase tracking-[0.22em]/g;
  $line =~ s/font-mono font-black uppercase tracking-\[0\.18em\]/font-display font-bold uppercase tracking-[0.18em]/g;
  $line =~ s/font-mono font-black uppercase tracking-\[0\.22em\]/font-display font-medium uppercase tracking-[0.22em]/g;
  $line =~ s/font-mono text-\[(9|10|11|12|13)px\] font-(bold|black) uppercase/font-display text-xs font-medium uppercase/g;
  $line =~ s/font-mono text-\[(9|10|11|12|13)px\] uppercase/font-display text-xs font-medium uppercase/g;
  $line =~ s/font-mono text-xs font-(bold|black) uppercase/font-display text-xs font-medium uppercase/g;
  $line =~ s/font-mono text-sm font-(bold|black) uppercase/font-display text-sm font-medium uppercase/g;
  $line =~ s/font-mono text-\[(9|10|11|12|13)px\] font-(bold|black)/font-display text-xs font-medium/g
    if $line =~ /uppercase/;

  if ($line =~ /uppercase/ && $line =~ /font-mono/) {
    $line =~ s/\bfont-mono\b/font-display/g;
  }
  if ($line =~ /tracking-\[0\./ && $line =~ /font-mono/) {
    $line =~ s/\bfont-mono\b/font-display/g;
  }
  if ($line =~ /`\{\s*\/\/\s*`/ || $line =~ /\{\`\/\/ \`\}/ || $line =~ /\/\/ `/) {
    $line =~ s/\bfont-mono\b/font-display/g;
  }

  $line =~ s/\bfont-mono\s+tabular-nums/tabular-nums/g;
  $line =~ s/\bfont-mono(\s+text-(?:xs|sm|base|lg|xl|2xl)[^\s"]*)?\s+(?=tabular-nums)/ /g;

  unless ($skip_remove) {
    $line =~ s/\bfont-mono\s+//g;
    $line =~ s/\s+font-mono\b//g;
  }

  $line;
}

find(
  {
    wanted => sub {
      return unless -f $_;
      return unless /\.(tsx|ts)$/;
      my $path = $File::Find::name;
      return if index($path, 'node_modules') >= 0;

      open my $fh, '<', $path or return;
      my @lines = <$fh>;
      close $fh;

      my $skip = should_skip($path);
      my $has_mono = grep { /font-mono/ } @lines;
      return unless $has_mono;

      my @out = map { fix_line($_, $skip) } @lines;
      my $new = join '', @out;
      my $old = join '', @lines;
      return if $new eq $old;

      open my $wh, '>', $path or die $!;
      print $wh $new;
      close $wh;
      print "fixed: $path\n";
    },
    no_chdir => 1,
  },
  "$ROOT/app",
  "$ROOT/components",
  "$ROOT/lib",
);
