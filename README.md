# Finger Actions

## Overview

スマートフォン画面内のキャンバスに手書き文字を入力して文字を認識させる、というアプリケーションです。

## Install & Settings

IBM Bluemix(http://bluemix.net/) から提供されている Watson Visual Recognition API および Cloudant データベースを使っています。IBM Bluemix のアカウントを取得し、これら２つのサービスインスタンスをそれぞれ作成してください。加えて、このアプリケーション自体を動かす Node.js ランタイムを１インスタンス作成してください。後述の作業を楽にする場合は、この作成した Node.js ランタイムに２つのサービス（Visual Recognition と Cloudant）をバインドしてください。

作成後、Visual Recognition API を使って、コレクションを１つ作成します。そのコレクション ID および、API KEY を利用するのでメモしておきます。

また Cloudant にデータベースを１つ作成します。また Cloudant にアクセスするためのユーザー名／パスワードと併せてメモしておきます。

GitHub.com からソースコードを一式ダウンロードします。メインページは public/new.html ですが、これを public/index.html にリネームしても構いません（その場合は既存の public/index.html を消すか別ファイル名にリネームしてください。

上記でメモした情報を settings.js 内に記載します。サービスをランタイムにバインドしている場合は Visual Recognition の API Key、および Cloudant のユーザー名／パスワードは実行時に自動的に紐付けられるので変更不要です。その場合は Visual Recognition のコレクション ID と Cloudant のデータベース名だけが記載されていれば動きます。

また、/admin が学習イメージの一覧を確認する管理画面になっています。このページにアクセスする時のみ認証が必要になり、そのユーザー名とパスワードが settings.js 内の basic_username / basic_password に設定されています。必要であればこれらの値も変更してください（変更しない場合はデフォルトの値を指定して利用することになります）。

最後に IBM Bluemix 内に Node.js ランタイムを作成し、そのアプリケーション名とドメイン名を manifest.yml 内に記載して、cf コマンドで push して、デプロイします。

デプロイが成功したら、スマホのブラウザでメインページにアクセスして使ってください。

学習したイメージの一覧は /admin へアクセスして確認ください。


## Tools & Information

- Watson Visual Recognition API(V3) のリファレンスはこちらを参照ください：

    - https://www.ibm.com/watson/developercloud/visual-recognition/api/v3/

- Watson Visual Recognition API を試験的に呼び出して動作を確認したり、コレクションを作成したりするには Watson API Explorer サイトを利用してください：

    - https://watson-api-explorer.mybluemix.net/apis/visual-recognition-v3

- Cloudant の API リファレンスはこちらを参照ください：

    - https://docs.cloudant.com/api.html


## Licensing

This code is licensed under MIT.


## Copyright

2019 K.Kimura @ Juge.Me all rights reserved.
