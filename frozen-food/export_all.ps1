$xl=New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
$out=New-Object System.Collections.Generic.List[object]
foreach($f in Get-ChildItem "$PSScriptRoot\Data Pembelian Frozen Food\*.xlsx"){
  $wb=$xl.Workbooks.Open($f.FullName,0,$true)
  foreach($s in $wb.Worksheets){
    $v=$s.UsedRange.Value2
    if($v -isnot [array] -or $v.GetLength(1) -lt 8){ continue }
    for($i=1;$i -le $v.GetLength(0);$i++){
      $k=$v[$i,2]; if(-not $k -or $k -eq 'KODEBARA'){ continue }
      $d=$v[$i,1]; if($d -is [double]){$d=[DateTime]::FromOADate($d).ToString('yyyy-MM-dd')}
      $row=[pscustomobject]@{File=$f.BaseName;Sheet=$s.Name;Tgl=$d;Kode=$k;Barang=$v[$i,3];Qty=$v[$i,4];Satuan=$v[$i,5];Harga=$v[$i,6];Jumlah=$v[$i,7];Nama=$v[$i,8]}
      $out.Add($row)
    }
  }
  $wb.Close($false)
}
$xl.Quit()
$out | Export-Csv "$PSScriptRoot\all_sheets.csv" -NoTypeInformation -Encoding UTF8
"rows: $($out.Count)"
