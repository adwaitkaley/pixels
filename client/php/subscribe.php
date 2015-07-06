<?php
if ( isset($_POST['subscriber']) && filter_var($_POST['subscriber'], FILTER_VALIDATE_EMAIL) ) {
      
      $e_mail = $_POST['subscriber'] . "," . "\n";
	  file_put_contents('emails/users-emails.txt', $e_mail, FILE_APPEND | LOCK_EX);

}
?>