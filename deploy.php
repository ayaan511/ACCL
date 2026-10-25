<?php
// Secure Webhook Deployment Endpoint for ACCL

// Define a unique secret token to ensure only GitHub can trigger this script
$secret = 'chickenislife'; 
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

if (!$signature) {
    http_response_code(403);
    die('Access Denied: Missing Signature');
}

$payload = file_get_contents('php://input');
$expected_signature = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected_signature, $signature)) {
    http_response_code(403);
    die('Access Denied: Invalid Authentication Token');
}

// Execute your local script file programmatically inside the server workspace
echo "Authentication passed. Syncing code repositories...\n";
unset($output);
exec('/bin/bash ./update.sh 2>&1', $output, $return_var);

if ($return_var === 0) {
    echo "Deployment completed successfully.";
} else {
    http_response_code(500);
    echo "Deployment failed with error code: " . $return_var . "\n";
    echo implode("\n", $output);
}
