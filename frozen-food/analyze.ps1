$d=Import-Csv "$PSScriptRoot\all_data.csv" | ?{ $_.Kode -and $_.Kode -ne 'KODEBARA' -and $_.Jumlah -ne '' }
function N($x){ if($x -is [string]){ [double]::Parse($x,[Globalization.CultureInfo]::InvariantCulture) } else {$x} }
$rows=foreach($r in $d){ [pscustomobject]@{File=$r.File;Tgl=$r.Tgl;Kode=$r.Kode;Barang=$r.Barang;Qty=(N $r.Qty);Sat=$r.Satuan;Harga=(N $r.Harga);Jumlah=(N $r.Jumlah);Nama=$r.Nama} }
"valid rows: $($rows.Count)"
"--- per bulan"
$rows | group File | %{ [pscustomobject]@{Bulan=$_.Name;Trx=$_.Count;Total=($_.Group|measure Jumlah -Sum).Sum;Qty=($_.Group|measure Qty -Sum).Sum;Pelanggan=($_.Group|select -Unique Nama).Count} } | ft -auto
"--- top 10 pelanggan"
$rows | group Nama | %{[pscustomobject]@{Nama=$_.Name;Trx=$_.Count;Total=($_.Group|measure Jumlah -Sum).Sum}} | sort Total -desc | select -first 10 | ft -auto
"--- top 10 barang by nominal"
$rows | group Barang | %{[pscustomobject]@{Barang=$_.Name;Trx=$_.Count;Total=($_.Group|measure Jumlah -Sum).Sum}} | sort Total -desc | select -first 10 | ft -auto
"--- top 15 single trx by Jumlah"
$rows | sort Jumlah -desc | select -first 15 File,Tgl,Barang,Qty,Sat,Harga,Jumlah,Nama | ft -auto
"--- top 15 single trx by Qty"
$rows | sort Qty -desc | select -first 15 File,Tgl,Barang,Qty,Sat,Jumlah,Nama | ft -auto
"--- Qty stats"
$q=$rows|%{$_.Qty}|sort; $n=$q.Count; "median $($q[[int]($n/2)]) p90 $($q[[int]($n*.9)]) p99 $($q[[int]($n*.99)]) max $($q[-1]) min $($q[0])"
"--- anomalies: qty<=0 or jumlah<=0"
($rows|?{$_.Qty -le 0 -or $_.Jumlah -le 0}).Count
"--- jumlah != qty*harga"
($rows|?{[math]::Abs($_.Qty*$_.Harga-$_.Jumlah) -gt 1000}).Count
"--- satuan"
$rows|group Sat|sort Count -desc|select -first 8 Name,Count|ft -auto
