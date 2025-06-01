<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}
/**
 * @package Loco Automatic Translate Addon
 */

class ProHelpers{

    // return user type
    public static function userType(){
        $type='';
      if(get_option('atlt-type')==false || get_option('atlt-type')=='free'){
            return $type='free';
        }else if(get_option('atlt-type')=='pro'){
            return $type='pro';
        }  
       
    }
  
    // validate key
    public static function validKey($key){
    if (preg_match("/^([A-Z0-9]{8})-([A-Z0-9]{8})-([A-Z0-9]{8})-([A-Z0-9]{8})$/",$key)){
         return true;
        }else{
            return false;
        }
    }
    //grab key
    public static function getLicenseKey(){
        $licenseKey=get_option("LocoAutomaticTranslateAddonPro_lic_Key","");
        if($licenseKey==''||$licenseKey==false){
            return false;
        }else{
            return $licenseKey;
          }
    }
    
   
   /*
   |----------------------------------------------------------------|
   |       return the total amount of time saved on translation     |
   | @param $characters int number of translated charachters        |
   |----------------------------------------------------------------|
   */
   public static function atlt_time_saved_on_translation( $characters ){
        $total_saved = intval( $characters ) / 1800 ;
        if($characters='' || $characters<=0){
            return;
        }
        if( $total_saved >=1 && is_float( $total_saved ) ){
            $hour = intval( $total_saved );
            $minute =  $total_saved - $hour;
            $minute = intval( $minute * 60 );
            return $hour .' hour and '. round($minute,2).' minutes';
        }else{
            $minute = floatval($total_saved) * 60;
            if( $minute <1 ){
                return round($minute * 60, 2) . ' seconds';
            }
            return round($minute,2) . ' minutes';
        }
    }

    
      
}
